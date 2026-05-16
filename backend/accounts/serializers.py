from rest_framework import serializers
from .models import CustomUser


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            'id',
            'username',
            'email',
            'password',
            'role',
            'specialty',
            'inpe_number',
            'diploma_file',
            'country',
            'city',
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)

        if user.role in ['DOCTOR', 'MODERATOR']:
            user.is_verified = False
        else:
            user.is_verified = True

        user.save()
        return user